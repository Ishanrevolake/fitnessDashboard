import { ClientProfilePage } from "@/components/client-profile-page";

type ClientProfileRouteProps = {
  searchParams: Promise<{
    clientId?: string;
    tab?: string;
  }>;
};

export default async function Page({ searchParams }: ClientProfileRouteProps) {
  const params = await searchParams;

  return <ClientProfilePage clientId={params.clientId} initialTab={params.tab} />;
}
