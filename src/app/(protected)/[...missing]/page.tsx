import { notFound } from 'next/navigation';

export default function CatchAllProtected() {
  notFound(); // This will now use /protected/not-found.tsx if it exists
}
