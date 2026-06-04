import { AppLayout } from "@/components/Layout/AppLayout";

interface PageProps {
  params: Promise<{ pageId: string }>;
}

export default async function PageRoute({ params }: PageProps) {
  const { pageId } = await params;
  return <AppLayout pageId={pageId} />;
}
