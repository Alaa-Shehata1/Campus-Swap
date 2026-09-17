import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { services } from '../../lib/services';
import { SESSION_COOKIE } from '../../lib/auth';

export default async function LogoutPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await services().identity.logout(token);
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}
