import { ClientsPage } from "@/components/clients-page";
import type { ClientStatus } from "@/lib/types";

type ClientsRouteProps = {
  searchParams: Promise<{
    status?: ClientStatus;
  }>;
};

export default async function Page({ searchParams }: ClientsRouteProps) {
  const params = await searchParams;
  const status = params.status === "active" || params.status === "inactive" ? params.status : "";

  return <ClientsPage initialStatus={status} />;
}
