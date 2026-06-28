import { ClientsPage } from "@/components/clients-page";
import type { ClientStatus } from "@/lib/types";

type ClientsRouteProps = {
  searchParams: Promise<{
    status?: ClientStatus;
    renewal?: string;
  }>;
};

export default async function Page({ searchParams }: ClientsRouteProps) {
  const params = await searchParams;
  const status = params.status === "active" || params.status === "inactive" ? params.status : "";
  const renewal = params.renewal === "ending-soon" ? params.renewal : "";

  return <ClientsPage initialStatus={status} initialRenewal={renewal} />;
}
