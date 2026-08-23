import ResultView from "./result-view";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) { return <main id="main"><ResultView id={(await params).id} /></main>; }
