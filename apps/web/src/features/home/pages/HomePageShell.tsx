import { getHomePayload } from "../lib/getHomePayload.server";
import HomeHeader from "../components/HomeHeader";
import HomeDestinations from "../components/HomeDestinations";
import ITGSupervisorHomeWorkspace from "../components/ITGSupervisorHomeWorkspace";

export default async function HomePageShell() {
  const payload = await getHomePayload();

  const isItgSupervisor = payload.role === "ITG_SUPERVISOR";

  return (
    <div className="space-y-4">
      <div
        id="shell-role-hint"
        data-shell-role={payload.role}
        className="hidden"
        aria-hidden="true"
      />

      {isItgSupervisor ? (
        <ITGSupervisorHomeWorkspace payload={payload} />
      ) : (
        <>
          <HomeHeader payload={payload} />
          <HomeDestinations payload={payload} />
        </>
      )}
    </div>
  );
}