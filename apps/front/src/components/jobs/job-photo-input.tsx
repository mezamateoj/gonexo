import { z } from "zod"
import { Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"

export const jobPhotoSchema = z
  .file("Selecciona una foto para continuar")
  .mime(["image/jpeg", "image/png", "image/webp"], "Usa una foto JPEG, PNG o WebP")
  .max(10 * 1024 * 1024, "La foto no puede superar los 10 MB")

type FieldErrorItem = string | { message?: string } | undefined | null | false

export function JobPhotoInput({
  id,
  file,
  errors,
  disabled,
  onBlur,
  onChange,
}: {
  id: string
  file: File | undefined
  errors: FieldErrorItem[]
  disabled: boolean
  onBlur: () => void
  onChange: (file: File | undefined) => void
}) {
  const isInvalid = errors.length > 0

  return (
    <Field data-invalid={isInvalid || undefined} data-disabled={disabled || undefined}>
      <FieldLabel htmlFor={id}>Foto del flete</FieldLabel>
      <Button
        asChild
        variant="outline"
        aria-disabled={disabled}
        className={cn(
          "h-11 w-full transition-transform active:scale-[0.96]",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <label htmlFor={id}>
          <Camera data-icon="inline-start" />
          {file ? "Cambiar foto" : "Seleccionar foto"}
          <input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="sr-only"
            aria-required="true"
            disabled={disabled}
            aria-invalid={isInvalid}
            onBlur={onBlur}
            onChange={(event) => onChange(event.target.files?.[0])}
          />
        </label>
      </Button>
      {file && <FieldDescription>Lista para subir: {file.name}</FieldDescription>}
      <FieldError errors={errors} />
    </Field>
  )
}
