import Link from "next/link";
import { cookies } from "next/headers";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const isAuthenticated = !!cookieStore.get("jira_token");

  if (isAuthenticated) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Link href="/dashboard" className="bg-blue-600 text-white px-6 py-3 rounded-lg">
            Acceder au dashboard
          </Link>
        </div>
      </main>
    );
  }

  const scopes = "read:jira-work read:jira-user offline_access read:board-scope:jira-software read:sprint:jira-software read:issue-details:jira-software read:jql:jira";
  const authUrl = new URL("https://auth.atlassian.com/authorize");
  authUrl.searchParams.set("audience", "api.atlassian.com");
  authUrl.searchParams.set("client_id", process.env.ATLASSIAN_CLIENT_ID || "");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("redirect_uri", process.env.ATLASSIAN_CALLBACK_URL || "");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", "sprint-generator");

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Sprint Delivery Generator</h1>
        <a href={authUrl.toString()} className="block w-full bg-blue-600 text-white font-medium py-3 px-6 rounded-lg">
          Se connecter avec Atlassian
        </a>
      </div>
    </main>
  );
}
