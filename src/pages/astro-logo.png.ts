export const prerender = false;

export async function GET() {
  const response = await fetch(
    "https://docs.astro.build/assets/full-logo-light.png",
  );

  return new Response(await response.arrayBuffer());
}
