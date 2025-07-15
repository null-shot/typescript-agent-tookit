import { redirect } from 'next/navigation';

export default function ChatRedirect() {
  redirect('/chat/new');
} 