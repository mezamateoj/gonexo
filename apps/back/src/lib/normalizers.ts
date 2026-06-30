export function normalizePhone(phone: string) {
  const value = phone.trim().replace(/[\s().-]/g, "");
  return value.startsWith("+") ? value : `+${value}`;
}

export function normalizeVehiclePlate(plate: string) {
  return plate.trim().replace(/[\s-]/g, "").toUpperCase();
}
