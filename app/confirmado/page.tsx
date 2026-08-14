import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default async function ConfirmadoPage({ searchParams }: { searchParams: Promise<{ unitName?: string }> }) {
  const { unitName } = await searchParams

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border rounded-2xl p-8 max-w-lg w-full text-center space-y-6 shadow-sm">
        <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
            {unitName ? `Unidade: ${unitName}` : 'Pedido Confirmado'}
          </span>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Pedido Enviado com Sucesso!</h1>
          <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            Seu pedido mensal de suprimentos foi registrado. O orçamentista já tem acesso à sua solicitação para consolidação.
          </p>
        </div>

        <div className="pt-4 border-t">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Voltar para o Início
          </Link>
        </div>
      </div>
    </main>
  )
}
