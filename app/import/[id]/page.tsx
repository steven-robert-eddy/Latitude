import { ImportReview } from "@/components/ImportReview";

export default async function ImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <ImportReview importId={id} />
    </main>
  );
}
