import InterviewView from "./interview-view";
export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) { return <main id="main"><InterviewView id={(await params).id}/></main>; }
