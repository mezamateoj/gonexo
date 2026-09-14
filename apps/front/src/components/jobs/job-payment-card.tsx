import { useCallback } from "react"
import { Wallet, initMercadoPago } from "@mercadopago/sdk-react"
import { CircleAlert, LockKeyhole } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { formatPrice } from "@/lib/display"

const publicKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY

if (publicKey) {
  initMercadoPago(publicKey, { locale: "es-CL" })
}

export function JobPaymentCard({ jobId, amount }: { jobId: string; amount: number }) {
  const checkout = useMutation({
    mutationFn: () => api.jobs.checkout(jobId),
  })

  const handleSubmit = useCallback(
    async () => {
      const result = await checkout.mutateAsync()
      return result.preferenceId
    },
    [checkout.mutateAsync],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Completa el pago</CardTitle>
        <CardDescription>
          Paga {formatPrice(amount)} con Mercado Pago para confirmar el flete y habilitar la coordinación.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Alert>
          <LockKeyhole />
          <AlertDescription>
            El transportista no recibe tus datos ni puede iniciar el trabajo hasta que confirmemos el pago.
          </AlertDescription>
        </Alert>

        {!publicKey ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>Mercado Pago no está configurado en esta aplicación.</AlertDescription>
          </Alert>
        ) : (
          <>
            {checkout.isError && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>{checkout.error.message}</AlertDescription>
              </Alert>
            )}
            <Wallet
              initialization={{ redirectMode: "self" }}
              locale="es-CL"
              onSubmit={handleSubmit}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
