import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Rider, RiderProfessionalStatus } from "@golfeexpress/types";
import { VehicleType } from "@golfeexpress/types";
import { fetchMyRiderProfile, updateMyRiderProfile } from "@/services/riderProfileApi";
import { uploadKycDocument } from "@/services/uploadsApi";
import { useAuthStore } from "@/store/useAuthStore";
import { DocumentPhotoField } from "@/components/DocumentPhotoField";
import { VEHICLE_LABELS } from "@/services/vehicleLabels";

interface RiderKycScreenProps {
  onClose: () => void;
}

const PROFESSIONAL_STATUS_LABELS: Record<RiderProfessionalStatus, string> = {
  AUTO_ENTREPRENEUR: "Auto-entrepreneur",
  SALARIE: "Salarié",
  INDEPENDANT: "Indépendant (autre statut)",
  AUTRE: "Autre",
};

const TERMS_VERSION = "1.0";

function Field({ label, children }: { label: string; children: any }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function RiderKycScreen({ onClose }: RiderKycScreenProps) {
  const user = useAuthStore((s) => s.user);
  const [rider, setRider] = useState<Rider | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [birthDate, setBirthDate] = useState("");
  const [street, setStreet] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");

  const [vehicleType, setVehicleType] = useState<VehicleType>(VehicleType.SCOOTER);
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [professionalStatus, setProfessionalStatus] = useState<RiderProfessionalStatus | "">("");
  const [siret, setSiret] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");

  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    fetchMyRiderProfile()
      .then((data) => {
        setRider(data);
        setBirthDate(data.birthDate?.slice(0, 10) ?? "");
        setStreet(data.street ?? "");
        setZipCode(data.zipCode ?? "");
        setCity(data.city ?? "");
        setVehicleType(data.vehicleType);
        setVehiclePlate(data.vehiclePlate ?? "");
        setLicenseNumber(data.licenseNumber ?? "");
        setProfessionalStatus(data.professionalStatus ?? "");
        setSiret(data.siret ?? "");
        setInsuranceProvider(data.insuranceProvider ?? "");
        setInsurancePolicyNumber(data.insurancePolicyNumber ?? "");
        setAcceptTerms(!!data.termsAcceptedAt);
        setStatus("loaded");
      })
      .catch(() => setStatus("error"));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateMyRiderProfile({
        birthDate: birthDate || null,
        street: street || null,
        zipCode: zipCode || null,
        city: city || null,
        vehicleType,
        vehiclePlate: vehiclePlate || null,
        licenseNumber: licenseNumber || null,
        professionalStatus: professionalStatus || null,
        siret: siret || null,
        insuranceProvider: insuranceProvider || null,
        insurancePolicyNumber: insurancePolicyNumber || null,
        // iban n'est plus éditable ici — les coordonnées bancaires passent
        // désormais par Stripe Connect (voir écran Gains). Le champ existe
        // encore en base pour compatibilité mais n'est plus renseigné
        // depuis cet écran.
        ...(acceptTerms && !rider?.termsAcceptedAt ? { acceptTerms: true, termsVersion: TERMS_VERSION } : {}),
      });
      setRider(updated);
      setMessage("✅ Dossier enregistré.");
    } catch (err) {
      setMessage(err instanceof Error ? `❌ ${err.message}` : "❌ Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#2ECC71" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={18} color="#1A1A2E" />
        </Pressable>
        <Text style={styles.headerTitle}>📋 Mon dossier</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Section title="État civil">
          <Field label="Date de naissance (AAAA-MM-JJ)">
            <TextInput value={birthDate} onChangeText={setBirthDate} placeholder="1995-04-12" style={styles.input} />
          </Field>
        </Section>

        <Section title="Adresse">
          <Field label="Rue">
            <TextInput value={street} onChangeText={setStreet} style={styles.input} />
          </Field>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="Code postal">
                <TextInput value={zipCode} onChangeText={setZipCode} keyboardType="number-pad" style={styles.input} />
              </Field>
            </View>
            <View style={{ flex: 2 }}>
              <Field label="Ville">
                <TextInput value={city} onChangeText={setCity} style={styles.input} />
              </Field>
            </View>
          </View>
        </Section>

        <Section title="Véhicule & statut">
          <Field label="Type de véhicule">
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {(Object.keys(VEHICLE_LABELS) as VehicleType[]).map((type) => (
                <Pressable key={type} onPress={() => setVehicleType(type)} style={[styles.chip, vehicleType === type && styles.chipActive]}>
                  <Text style={[styles.chipText, vehicleType === type && styles.chipTextActive]}>
                    {VEHICLE_LABELS[type].emoji} {VEHICLE_LABELS[type].label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>
          <Field label="Plaque d'immatriculation">
            <TextInput value={vehiclePlate} onChangeText={setVehiclePlate} style={styles.input} />
          </Field>
          <Field label="N° de permis">
            <TextInput value={licenseNumber} onChangeText={setLicenseNumber} style={styles.input} />
          </Field>
          <Field label="Statut professionnel">
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {(Object.keys(PROFESSIONAL_STATUS_LABELS) as RiderProfessionalStatus[]).map((s) => (
                <Pressable key={s} onPress={() => setProfessionalStatus(s)} style={[styles.chip, professionalStatus === s && styles.chipActive]}>
                  <Text style={[styles.chipText, professionalStatus === s && styles.chipTextActive]}>
                    {PROFESSIONAL_STATUS_LABELS[s]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>
          {(professionalStatus === "AUTO_ENTREPRENEUR" || professionalStatus === "INDEPENDANT") && (
            <Field label="SIRET (si indépendant)">
              <TextInput value={siret} onChangeText={setSiret} keyboardType="number-pad" style={styles.input} />
            </Field>
          )}
        </Section>

        <Section title="Assurance">
          <Field label="Compagnie d'assurance">
            <TextInput value={insuranceProvider} onChangeText={setInsuranceProvider} style={styles.input} />
          </Field>
          <Field label="N° de police d'assurance">
            <TextInput value={insurancePolicyNumber} onChangeText={setInsurancePolicyNumber} style={styles.input} />
          </Field>
        </Section>

        <Section title="Documents (KYC)">
          <DocumentPhotoField
            label="Pièce d'identité — recto"
            currentImageUrl={rider?.idCardFront}
            onUpload={async (uri) => {
              if (!user) return;
              const url = await uploadKycDocument(user.id, "id-front", uri);
              const updated = await updateMyRiderProfile({ idCardFront: url });
              setRider(updated);
            }}
          />
          <DocumentPhotoField
            label="Pièce d'identité — verso"
            currentImageUrl={rider?.idCardBack}
            onUpload={async (uri) => {
              if (!user) return;
              const url = await uploadKycDocument(user.id, "id-back", uri);
              const updated = await updateMyRiderProfile({ idCardBack: url });
              setRider(updated);
            }}
          />
          <DocumentPhotoField
            label="Selfie de vérification"
            hint="Photo de face, sans lunettes ni casque — usage interne uniquement, jamais affiché publiquement."
            currentImageUrl={rider?.verificationSelfieUrl}
            isSelfie
            onUpload={async (uri) => {
              if (!user) return;
              const url = await uploadKycDocument(user.id, "selfie", uri);
              const updated = await updateMyRiderProfile({ verificationSelfieUrl: url });
              setRider(updated);
            }}
          />
        </Section>

        <Section title="Coordonnées bancaires">
          <View style={styles.bankRedirectBox}>
            <Ionicons name="card-outline" size={20} color="#1A1A2E" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.bankRedirectTitle}>Gérées depuis l'écran "Mes gains"</Text>
              <Text style={styles.bankRedirectText}>
                Vos coordonnées bancaires sont désormais configurées (et modifiables à tout moment, par exemple en
                cas de changement de banque) via le formulaire sécurisé Stripe, accessible depuis l'onglet Gains.
              </Text>
            </View>
          </View>
        </Section>

        <Section title="Conditions générales">
          <Pressable onPress={() => setAcceptTerms((v) => !v)} style={styles.termsRow}>
            <View style={[styles.checkbox, acceptTerms && styles.checkboxActive]}>
              {acceptTerms && <Ionicons name="checkmark" size={13} color="white" />}
            </View>
            <Text style={styles.termsText}>
              J'accepte les Conditions Générales d'Utilisation et de Vente de Do You Geckoo.
              {rider?.termsAcceptedAt && (
                <Text style={{ color: "#6B7280" }}>{"\n"}Acceptées le {new Date(rider.termsAcceptedAt).toLocaleDateString("fr-FR")}.</Text>
              )}
            </Text>
          </Pressable>
        </Section>

        {message && <Text style={{ marginBottom: 12, fontSize: 13 }}>{message}</Text>}

        <Pressable onPress={handleSave} disabled={saving} style={[styles.saveBtn, { opacity: saving ? 0.7 : 1 }]}>
          {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Enregistrer mon dossier</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "white" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn: { height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: "#F3F4F6" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A2E" },
  section: { marginBottom: 20 },
  bankRedirectBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    padding: 14,
  },
  bankRedirectTitle: { fontSize: 13, fontWeight: "700", color: "#1A1A2E" },
  bankRedirectText: { marginTop: 3, fontSize: 12, lineHeight: 17, color: "#6B7280" },
  sectionTitle: { marginBottom: 10, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, color: "#6B7280" },
  fieldLabel: { marginBottom: 4, fontSize: 12, fontWeight: "600", color: "#1A1A2E" },
  input: { borderRadius: 8, backgroundColor: "#F3F4F6", paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#1A1A2E" },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { borderColor: "#2ECC71", backgroundColor: "#E8F5E9" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#1A1A2E" },
  chipTextActive: { color: "#2ECC71" },
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkbox: { height: 22, width: 22, alignItems: "center", justifyContent: "center", borderRadius: 6, borderWidth: 2, borderColor: "#D1D5DB", marginTop: 1 },
  checkboxActive: { borderColor: "#2ECC71", backgroundColor: "#2ECC71" },
  termsText: { flex: 1, fontSize: 13, color: "#1A1A2E", lineHeight: 19 },
  saveBtn: { alignItems: "center", borderRadius: 16, backgroundColor: "#2ECC71", paddingVertical: 16 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "white" },
});
