import { CreateOrganizationForm } from '../features/organizations/components/CreateOrganizationForm.jsx';

export function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-(--color-bg) text-(--color-text) px-6">
      <div className="w-full max-w-sm">
        <p className="text-meta text-(--color-text)/50 mb-2">GET STARTED</p>
        <h1 className="text-2xl font-semibold mb-8">Create your organization</h1>
        <CreateOrganizationForm />
      </div>
    </div>
  );
}
