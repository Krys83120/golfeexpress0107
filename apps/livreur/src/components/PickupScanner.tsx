import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet, Platform } from "react-native";
import jsQR from "jsqr";
import { parsePickupQr, normalizeManualCode } from "@/lib/pickupQr";

interface PickupPanelProps {
  /** Commande en cours : le QR scanné doit porter exactement cet id. */
  expectedOrderId: string;
  /** Numéro lisible de la commande en cours (celui imprimé sur le ticket), affiché pour que le livreur sache laquelle réclamer au commerçant. */
  expectedOrderNumber?: string;
  /** Envoie le code au serveur (POST /api/order-pickup). Doit lever une Error au message lisible en cas de refus. */
  onSubmitCode: (code: string) => Promise<void>;
  onCancel: () => void;
}

const SCAN_INTERVAL_MS = 150;
const MAX_SCAN_SIDE_PX = 640;

/**
 * Validation de la récupération chez le commerçant (06/10/2026) : le livreur
 * scanne le QR imprimé sur le ticket (ou affiché dans l'app du Pro) avec la
 * caméra de son téléphone. En cas de caméra indisponible/refusée, il peut
 * saisir à la main le code à 6 chiffres écrit sous le QR.
 *
 * La caméra n'est disponible que sur l'export web (getUserMedia + jsQR, un
 * décodeur QR en pur JavaScript qui fonctionne aussi sur Safari iOS, qui n'a
 * pas l'API BarcodeDetector) ; sur une build native, seul le code manuel est
 * proposé. Ce composant n'envoie jamais rien lui-même : il décode, vérifie
 * que le QR est bien celui de la commande en cours, puis appelle onSubmitCode.
 */
export function PickupPanel({ expectedOrderId, expectedOrderNumber, onSubmitCode, onCancel }: PickupPanelProps) {
  const [manualCode, setManualCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraHint, setCameraHint] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(Platform.OS === "web");
  // Après un refus du serveur (ex: "pas encore prête", "trop loin"), le scan
  // automatique se met en pause jusqu'à un appui sur "Scanner à nouveau" :
  // sans ça, le QR resterait dans le champ de la caméra et serait renvoyé en
  // boucle, ce qui épuiserait vite la limite d'essais côté serveur.
  const [paused, setPaused] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Les callbacks sont lus via des refs : l'effet caméra ne dépend que de
  // `cameraActive`, il ne doit pas se relancer (et rouvrir la caméra) à
  // chaque rendu du parent.
  const submittingRef = useRef(false);
  const pausedRef = useRef(false);
  const onSubmitCodeRef = useRef(onSubmitCode);
  onSubmitCodeRef.current = onSubmitCode;

  async function submit(code: string) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmitCodeRef.current(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation impossible pour le moment.");
      submittingRef.current = false;
      pausedRef.current = true;
      setPaused(true);
      setSubmitting(false);
      return;
    }
    // Succès : le parent ferme ce panneau, on ne rétablit pas l'état ici.
  }

  useEffect(() => {
    if (Platform.OS !== "web" || !cameraActive) return;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stream: MediaStream | null = null;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    function stopCamera() {
      stopped = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
    }

    function handleDecoded(text: string) {
      const parsed = parsePickupQr(text);
      if (!parsed) {
        setCameraHint("Ce QR code n'est pas celui d'un ticket Do You Geckoo.");
        return false;
      }
      if (parsed.orderId !== expectedOrderId) {
        // Le commerçant s'est trompé de commande : erreur bien visible, et pause
        // du scan (sinon le message clignoterait tant que le ticket reste devant
        // la caméra). Rien n'est envoyé au serveur.
        setCameraHint(null);
        setError(
          `Ce n'est pas la bonne commande : ce ticket est celui d'une autre commande.${
            expectedOrderNumber ? ` Demandez au commerçant la commande ${expectedOrderNumber}.` : " Demandez au commerçant votre commande."
          }`
        );
        pausedRef.current = true;
        setPaused(true);
        return false;
      }
      setCameraHint(null);
      return true;
    }

    function tick() {
      if (stopped) return;
      const video = videoRef.current;
      if (
        video &&
        context &&
        video.readyState === video.HAVE_ENOUGH_DATA &&
        !submittingRef.current &&
        !pausedRef.current
      ) {
        const scale = Math.min(1, MAX_SCAN_SIDE_PX / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
        if (result?.data && handleDecoded(result.data)) {
          const parsed = parsePickupQr(result.data);
          if (parsed) {
            submit(parsed.code);
          }
        }
      }
      timer = setTimeout(tick, SCAN_INTERVAL_MS);
    }

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraActive(false);
        setCameraHint("La caméra n'est pas disponible sur cet appareil : saisissez le code à 6 chiffres du ticket.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        tick();
      } catch {
        setCameraActive(false);
        setCameraHint(
          "Accès à la caméra refusé. Autorisez-la dans les réglages du navigateur, ou saisissez le code à 6 chiffres du ticket."
        );
      }
    })();

    return stopCamera;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive, expectedOrderId, expectedOrderNumber]);

  function resumeScanning() {
    pausedRef.current = false;
    setPaused(false);
    setError(null);
    setCameraHint(null);
  }

  function handleManualSubmit() {
    const code = normalizeManualCode(manualCode);
    if (code.length !== 6) {
      setError("Le code comporte 6 chiffres.");
      return;
    }
    submit(code);
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Remise par le commerçant</Text>
      {expectedOrderNumber ? <Text style={styles.orderRef}>Commande à récupérer : {expectedOrderNumber}</Text> : null}
      <Text style={styles.hint}>
        Scannez le QR code imprimé sur le ticket de la commande. Ne partez pas sans avoir validé : c'est ce qui
        enregistre la remise à votre nom.
      </Text>

      {Platform.OS === "web" && cameraActive && (
        <View style={styles.cameraWrap}>
          {React.createElement("video", {
            ref: videoRef,
            playsInline: true,
            muted: true,
            style: { width: "100%", height: "100%", objectFit: "cover", backgroundColor: "#000" },
          })}
          <View pointerEvents="none" style={styles.reticle} />
        </View>
      )}

      {cameraHint && <Text style={styles.cameraHint}>{cameraHint}</Text>}
      {submitting && <Text style={styles.cameraHint}>Validation en cours…</Text>}

      <Text style={styles.manualLabel}>Ou saisissez le code à 6 chiffres écrit sous le QR</Text>
      <TextInput
        value={manualCode}
        onChangeText={(text) => setManualCode(normalizeManualCode(text))}
        placeholder="Ex: 483920"
        placeholderTextColor="rgba(255,255,255,0.4)"
        keyboardType="number-pad"
        maxLength={7}
        style={styles.manualInput}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}
      {paused && Platform.OS === "web" && cameraActive && (
        <Pressable onPress={resumeScanning} style={[styles.secondaryBtn, { marginTop: 8, flex: 0 }]}>
          <Text style={styles.secondaryText}>📷 Scanner à nouveau</Text>
        </Pressable>
      )}

      <View style={styles.buttonsRow}>
        <Pressable onPress={onCancel} disabled={submitting} style={[styles.secondaryBtn, { opacity: submitting ? 0.5 : 1 }]}>
          <Text style={styles.secondaryText}>Fermer</Text>
        </Pressable>
        <Pressable
          onPress={handleManualSubmit}
          disabled={submitting || manualCode.length !== 6}
          style={[styles.primaryBtn, { opacity: submitting || manualCode.length !== 6 ? 0.5 : 1 }]}
        >
          <Text style={styles.primaryText}>Valider le code</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginBottom: 16, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.06)", padding: 12 },
  title: { marginBottom: 6, fontSize: 13, fontWeight: "700", color: "white" },
  orderRef: { marginBottom: 6, fontSize: 15, fontWeight: "800", color: "white" },
  hint: { marginBottom: 10, fontSize: 12, lineHeight: 17, color: "rgba(255,255,255,0.8)" },
  cameraWrap: {
    height: 240,
    marginBottom: 10,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  reticle: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#2ECC71",
  },
  cameraHint: { marginBottom: 8, fontSize: 12, color: "#FFB27A" },
  manualLabel: { marginTop: 2, marginBottom: 6, fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.8)" },
  manualInput: {
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "white",
    fontSize: 16,
    letterSpacing: 3,
  },
  errorText: { marginTop: 8, fontSize: 12, color: "#FCA5A5" },
  buttonsRow: { marginTop: 10, flexDirection: "row", gap: 8 },
  secondaryBtn: {
    flex: 1,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingVertical: 12,
  },
  secondaryText: { fontSize: 13, fontWeight: "700", color: "white" },
  primaryBtn: { flex: 2, alignItems: "center", borderRadius: 8, backgroundColor: "#2ECC71", paddingVertical: 12 },
  primaryText: { fontSize: 13, fontWeight: "700", color: "white" },
});
