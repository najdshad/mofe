import RegistrationForm from "../_components/RegistrationForm";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-4xl text-ink-strong">mofé</h1>
          <p className="mt-2 text-sm text-ink-muted">ساخت حساب کافه جدید</p>
        </div>
        <RegistrationForm />
      </div>
    </div>
  );
}
