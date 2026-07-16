import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api, cdnUrl } from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import { vehicleLabels } from "@/lib/display"

export const Route = createFileRoute("/_app/drivers/$id")({
  component: PublicDriverProfilePage,
})

function PublicDriverProfilePage() {
  const { id } = Route.useParams()
  const { data: profile, isLoading } = useQuery({ queryKey: queryKeys.drivers.detail(id), queryFn: () => api.drivers.get(id) })

  if (isLoading) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>
  if (!profile) return null

  return <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-8">
    <div>
      <div className="flex items-center gap-2"><h1 className="text-2xl font-semibold">{profile.user.name}</h1>{profile.isVerified && <Badge>Verificado</Badge>}</div>
      <p className="text-sm text-muted-foreground">{vehicleLabels[profile.vehicleType] ?? profile.vehicleType}{profile.vehicleYear ? ` · ${profile.vehicleYear}` : ""}</p>
    </div>
    <Card>
      <CardHeader><CardTitle>Vehículo</CardTitle><CardDescription>{profile.vehicleDescription ?? "Información del vehículo"}</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-4">
        {profile.vehicleCapacity && <p className="text-sm text-muted-foreground">Capacidad: {profile.vehicleCapacity}</p>}
        {profile.vehiclePhotos.length > 0 && <div className="flex flex-wrap gap-3">{profile.vehiclePhotos.map((photo) => <img key={photo.key} src={cdnUrl(photo.key)} alt={`Vehículo de ${profile.user.name}`} className="size-32 rounded-lg object-cover" />)}</div>}
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Experiencia</CardTitle><CardDescription>{profile.totalJobs} viajes completados{profile.avgRating != null ? ` · ${Number(profile.avgRating).toFixed(1)} de calificación` : ""}</CardDescription></CardHeader>
      {profile.bio && <CardContent><p className="text-sm">{profile.bio}</p></CardContent>}
    </Card>
    {profile.recentReviews.length > 0 && <Card>
      <CardHeader><CardTitle>Opiniones recientes</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">{profile.recentReviews.map((review) => <div key={`${review.reviewer.name}-${review.createdAt}`} className="flex flex-col gap-1"><p className="text-sm font-medium">{review.reviewer.name} · {review.rating}/5</p>{review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}</div>)}</CardContent>
    </Card>}
  </div>
}
