import { Link } from 'react-router';

export function meta() {
  return [{ title: 'Runtime proof — AkikSystems' }];
}

export default function About() {
  return (
    <main>
      <p>Runtime proof</p>
      <h1>Client navigation is enabled</h1>
      <p>This second route is reachable through React Router without a full-page navigation.</p>
      <Link to="/">Return to the server-rendered home route</Link>
    </main>
  );
}
