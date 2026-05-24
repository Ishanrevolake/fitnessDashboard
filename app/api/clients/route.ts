import { createClient as createSupabaseClient, type User } from "@supabase/supabase-js";
import { createClient as createLocalClient } from "@/lib/client-store";
import { defaultMetrics, defaultWorkoutPlans, packageOptions } from "@/lib/mock-data";
import type { ClientMealPlan, FitnessClient, NewClientInput, PackageId, WorkoutPlan } from "@/lib/types";

type PackageSelectionRecord = {
  user_id?: string;
  package_id?: string;
  package_title?: string;
  total_price_lkr?: number;
  created_at?: string;
};

type WorkoutPlanRecord = {
  client_id?: string;
  assigned_program_id?: string;
  focus?: string;
  start_date?: string;
  weekly_schedule?: string[];
  trainer_notes?: string;
  days?: WorkoutPlan["days"];
};

type MealPlanRecord = {
  client_id?: string;
  focus?: string;
  start_date?: string;
  trainer_notes?: string;
  days?: ClientMealPlan["days"];
};

type ClientNoteRecord = {
  client_id?: string;
  id: string;
  body: string;
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

function getMetadataText(metadata: Record<string, unknown> | undefined, keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

function getUserRole(user: User) {
  const appRole = getMetadataText(user.app_metadata, ["role", "user_role"]);
  const userRole = getMetadataText(user.user_metadata, ["role", "user_role"]);

  return (appRole || userRole || "client").toLowerCase();
}

function getPackageId(value: string): PackageId {
  return packageOptions.some((option) => option.id === value) ? (value as PackageId) : "training-plan";
}

function getClientName(user: User) {
  const metadataName = getMetadataText(user.user_metadata, ["name", "full_name", "display_name"]);
  if (metadataName) return metadataName;

  const firstName = getMetadataText(user.user_metadata, ["first_name", "firstName"]);
  const lastName = getMetadataText(user.user_metadata, ["last_name", "lastName"]);
  const combinedName = `${firstName} ${lastName}`.trim();
  if (combinedName) return combinedName;

  return user.email?.split("@")[0] ?? "Client";
}

function getClientAvatar(user: User) {
  const avatar = getMetadataText(user.user_metadata, ["avatar_url", "picture", "photo_url"]);
  if (avatar) return avatar;

  const name = encodeURIComponent(getClientName(user));
  return `https://ui-avatars.com/api/?name=${name}&background=ef3d4a&color=ffffff&size=160`;
}

function getDaysLeft(packageSelection?: PackageSelectionRecord) {
  if (!packageSelection?.created_at) return 0;

  const packageId = getPackageId(packageSelection.package_id ?? "");
  const durationDays = packageOptions.find((option) => option.id === packageId)?.durationDays ?? 0;
  if (!durationDays) return 0;

  const createdAt = new Date(packageSelection.created_at).getTime();
  if (Number.isNaN(createdAt)) return 0;

  const elapsedDays = Math.floor((Date.now() - createdAt) / 86_400_000);
  return Math.max(durationDays - elapsedDays, 0);
}

function mapPlanRecordToWorkoutPlan(record?: WorkoutPlanRecord): WorkoutPlan {
  if (!record) {
    return {
      ...defaultWorkoutPlans.reset,
      focus: "Initial training plan pending trainer review.",
    };
  }

  return {
    assignedProgramId: record.assigned_program_id || "custom-workout-plan",
    focus: record.focus || "Initial training plan pending trainer review.",
    startDate: record.start_date || new Date().toISOString().slice(0, 10),
    weeklySchedule: record.weekly_schedule ?? [],
    trainerNotes: record.trainer_notes ?? "",
    days: record.days ?? [],
  };
}

function mapRecordToMealPlan(record?: MealPlanRecord): ClientMealPlan | undefined {
  if (!record) return undefined;

  return {
    focus: record.focus || "Custom nutrition plan",
    startDate: record.start_date || new Date().toISOString().slice(0, 10),
    trainerNotes: record.trainer_notes ?? "",
    days: record.days ?? [],
  };
}

function mapRecordToNote(record: ClientNoteRecord) {
  return {
    id: record.id,
    body: record.body,
    createdAt: new Date(record.created_at).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

function mapUserToClient(
  user: User,
  packageSelection?: PackageSelectionRecord,
  workoutPlanRecord?: WorkoutPlanRecord,
  mealPlanRecord?: MealPlanRecord,
  notes: ClientNoteRecord[] = [],
): FitnessClient {
  const packageId = getPackageId(
    packageSelection?.package_id ??
      getMetadataText(user.user_metadata, ["package_id", "packageId", "package"]) ??
      "",
  );

  return {
    id: user.id,
    name: getClientName(user),
    email: user.email ?? "No email",
    phone: getMetadataText(user.user_metadata, ["phone", "phone_number", "mobile"]) || "Not provided",
    avatar: getClientAvatar(user),
    status: user.confirmed_at ? "active" : "inactive",
    packageId,
    packageName: packageSelection?.package_title || getMetadataText(user.user_metadata, ["package_title", "packageName"]),
    daysLeft: getDaysLeft(packageSelection),
    goal: getMetadataText(user.user_metadata, ["goal", "fitness_goal"]) || "No goal added yet.",
    timezone: getMetadataText(user.user_metadata, ["timezone", "time_zone"]) || "Not set",
    notes: notes.map(mapRecordToNote),
    photos: [],
    metrics: defaultMetrics,
    workoutPlan: mapPlanRecordToWorkoutPlan(workoutPlanRecord),
    mealPlan: mapRecordToMealPlan(mealPlanRecord),
  };
}

export async function GET() {
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json(
      {
        message:
          "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local so the server can read Supabase Auth users.",
      },
      { status: 500 },
    );
  }

  const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { users },
    error,
  } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    return Response.json({ message: error.message || "Unable to load users." }, { status: 500 });
  }

  const clientUsers = users.filter((user) => !["admin", "trainer"].includes(getUserRole(user)));
  const userIds = clientUsers.map((user) => user.id);
  const selectionsByUserId = new Map<string, PackageSelectionRecord>();
  const workoutPlansByUserId = new Map<string, WorkoutPlanRecord>();
  const mealPlansByUserId = new Map<string, MealPlanRecord>();
  const notesByUserId = new Map<string, ClientNoteRecord[]>();

  if (userIds.length > 0) {
    const { data: selections } = await supabase
      .from("package_selections")
      .select("user_id,package_id,package_title,total_price_lkr,created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: false });

    (selections ?? []).forEach((selection) => {
      const typedSelection = selection as PackageSelectionRecord;
      if (typedSelection.user_id && !selectionsByUserId.has(typedSelection.user_id)) {
        selectionsByUserId.set(typedSelection.user_id, typedSelection);
      }
    });

    const { data: workoutPlans } = await supabase
      .from("client_workout_plans")
      .select("client_id,assigned_program_id,focus,start_date,weekly_schedule,trainer_notes,days")
      .in("client_id", userIds);

    (workoutPlans ?? []).forEach((workoutPlan) => {
      const typedPlan = workoutPlan as WorkoutPlanRecord;
      if (typedPlan.client_id) workoutPlansByUserId.set(typedPlan.client_id, typedPlan);
    });

    const { data: mealPlans } = await supabase
      .from("client_meal_plans")
      .select("client_id,focus,start_date,trainer_notes,days")
      .in("client_id", userIds);

    (mealPlans ?? []).forEach((mealPlan) => {
      const typedPlan = mealPlan as MealPlanRecord;
      if (typedPlan.client_id) mealPlansByUserId.set(typedPlan.client_id, typedPlan);
    });

    const { data: notes } = await supabase
      .from("client_notes")
      .select("client_id,id,body,created_at")
      .in("client_id", userIds)
      .order("created_at", { ascending: false });

    (notes ?? []).forEach((note) => {
      const typedNote = note as ClientNoteRecord;
      if (!typedNote.client_id) return;

      notesByUserId.set(typedNote.client_id, [...(notesByUserId.get(typedNote.client_id) ?? []), typedNote]);
    });
  }

  return Response.json(
    clientUsers.map((user) =>
      mapUserToClient(
        user,
        selectionsByUserId.get(user.id),
        workoutPlansByUserId.get(user.id),
        mealPlansByUserId.get(user.id),
        notesByUserId.get(user.id) ?? [],
      ),
    ),
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<NewClientInput>;

  if (!body.firstName || !body.lastName || !body.email || !body.packageId) {
    return Response.json({ message: "Missing required client fields." }, { status: 400 });
  }

  const client = createLocalClient({
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    phone: body.phone ?? "",
    packageId: body.packageId,
  });

  return Response.json(client, { status: 201 });
}
