import { redirect } from 'next/navigation';

export default function TerminalStressTestPage() {
  // Stress Test is fundamentally a simulated environment concept.
  // It violates the architectural integrity of the live terminal.
  redirect('/demo/stress-test');
}
