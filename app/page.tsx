export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-32 text-center">
      <h1 className="font-sans text-2xl font-semibold tracking-tight text-ink">Latitude</h1>
      <p className="mt-3 max-w-md text-ink-soft">
        A lab notebook for deliberately improving at photography. The curriculum, cull trainer, and
        insights modules land in later phases — for now, try{" "}
        <a href="/import" className="text-mark underline underline-offset-2">
          importing some photos
        </a>
        .
      </p>
    </main>
  );
}
