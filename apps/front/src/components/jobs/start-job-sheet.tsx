import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { Camera } from "lucide-react"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { uploadFile } from "@/lib/api"
import { useAdvanceJobStatus } from "@/hooks/use-request-mutations"
import { JobPhotoInput, jobPhotoSchema } from "./job-photo-input"

const startJobSchema = z.object({ photo: jobPhotoSchema })

export function StartJobSheet({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const advance = useAdvanceJobStatus(jobId)
  const form = useForm({
    defaultValues: { photo: undefined as File | undefined },
    validators: { onSubmit: startJobSchema },
    onSubmit: async ({ value }) => {
      setUploadError(null)
      setUploading(true)
      let uploaded
      try {
        uploaded = await uploadFile(value.photo!)
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "No pudimos subir la foto")
        setUploading(false)
        return
      }
      setUploading(false)

      try {
        await advance.mutateAsync({ status: "on_the_way", photoKey: uploaded.key })
        form.reset()
        setOpen(false)
      } catch {
        // The mutation hook shows the backend error.
      }
    },
  })
  const busy = uploading || advance.isPending

  function handleOpenChange(next: boolean) {
    if (!next && !busy) {
      form.reset()
      setUploadError(null)
    }
    if (!busy) setOpen(next)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button type="button" className="mt-1.5 h-9 w-fit px-4 text-[13px] font-semibold active:scale-[0.97]">
          Iniciar viaje
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <form
          className="mx-auto flex w-full max-w-md flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <SheetHeader className="items-center gap-1.5 px-8 py-0 text-center">
            <SheetTitle>Iniciar viaje</SheetTitle>
            <SheetDescription>
              Sube una foto antes de iniciar el flete. Se guardará como respaldo para ambas partes.
            </SheetDescription>
          </SheetHeader>

          <FieldGroup>
            <form.Field name="photo" validators={{ onBlur: jobPhotoSchema }}>
              {(field) => (
                <JobPhotoInput
                  id="start-job-photo"
                  file={field.state.value}
                  errors={field.state.meta.errors}
                  disabled={busy}
                  onBlur={field.handleBlur}
                  onChange={(file) => {
                    field.handleChange(file)
                    setUploadError(null)
                  }}
                />
              )}
            </form.Field>
          </FieldGroup>

          {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

          <SheetFooter className="p-0">
            <form.Subscribe selector={(state) => state.values.photo}>
              {(photo) => (
                <Button type="submit" disabled={!photo || busy} className="h-11 w-full text-[15px] font-semibold">
                  <Camera data-icon="inline-start" />
                  {uploading ? "Subiendo foto…" : advance.isPending ? "Iniciando…" : "Subir foto e iniciar"}
                </Button>
              )}
            </form.Subscribe>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
