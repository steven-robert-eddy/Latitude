import { BulkImportForm } from "@/components/BulkImportForm";

export default function ImportPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="font-sans text-xl font-semibold text-ink">Import photos</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Point this at a folder of JPEGs, TIFFs, or RAW files. RAW+JPEG pairs from the same shutter
          press are grouped automatically, and one bad file never stops the rest.
        </p>
      </div>
      <BulkImportForm />
    </main>
  );
}
