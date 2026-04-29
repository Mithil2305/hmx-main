export function navigateByRole(navigate: (path: string, opts?: any) => void, role?: string | null) {
  if (role === 'admin') return navigate('/admin', { replace: true });
  if (role === 'pilot') return navigate('/pilot', { replace: true });
  if (role === 'referral') return navigate('/referral', { replace: true });
  // default to business/client
  return navigate('/client', { replace: true });
}
