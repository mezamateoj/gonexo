import { AddressAutocomplete, type AddressResult } from "@/components/address-autocomplete"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

export function AddressStep({
  value,
  onChange,
  floor,
  onFloor,
  elevator,
  onElevator,
  sessionToken,
  attempted,
}: {
  value: AddressResult | null
  onChange: (r: AddressResult) => void
  floor: string
  onFloor: (v: string) => void
  elevator: boolean
  onElevator: (v: boolean) => void
  sessionToken: string
  attempted: boolean
}) {
  const addressInvalid = attempted && !value
  return (
    <FieldGroup>
      <Field data-invalid={addressInvalid}>
        <FieldLabel className="text-[12px] font-medium text-[#485450]">Dirección</FieldLabel>
        <AddressAutocomplete
          value={value}
          onChange={onChange}
          placeholder="Busca la dirección en Chile…"
          sessionToken={sessionToken}
        />
        {addressInvalid && <FieldError>Selecciona una dirección de la lista</FieldError>}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel className="text-[12px] font-medium text-[#485450]">Piso <span className="text-[#B0ABA5]">(opcional)</span></FieldLabel>
          <Input type="number" placeholder="1" value={floor} onChange={(e) => onFloor(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel className="text-[12px] font-medium text-[#485450]">¿Hay ascensor?</FieldLabel>
          <div className="flex h-10 items-center justify-between rounded-[8px] border border-[#E9E7E3] bg-white px-3">
            <span className="text-[14px] text-[#121715]">{elevator ? "Sí" : "No"}</span>
            <Switch checked={elevator} onCheckedChange={onElevator} />
          </div>
        </Field>
      </div>
    </FieldGroup>
  )
}
