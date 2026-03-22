import { redirect } from 'next/navigation'

export default async function ExecucaoIndexPage({ params }: { params: Promise<{ ano: string }> }) {
  const { ano } = await params
  redirect(`/execucao/${ano}/dashboard`)
}
