import AssessmentForm from "./assessment-form";
import AuthGate from "@/components/auth-gate";

export default function AssessPage() { return <AuthGate><main id="main"><header className="page-head"><p className="eyebrow">Penilaian baru</p><h1>Bawa satu bukti.</h1><p className="lede">GitHub untuk Informatika, gambar karya untuk DKV, atau PDF laporan untuk Bisnis/Pemasaran.</p></header><AssessmentForm /></main></AuthGate>; }
