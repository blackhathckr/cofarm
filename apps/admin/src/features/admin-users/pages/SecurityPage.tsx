import { OwnPasswordCard } from '../components/OwnPasswordCard';
import { TwoFactorCard } from '../components/TwoFactorCard';

export function SecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your security</h1>
        <p className="text-sm text-muted-foreground">Settings for your own console account only.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TwoFactorCard />
        <OwnPasswordCard />
      </div>
    </div>
  );
}
