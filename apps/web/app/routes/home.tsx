import { Link } from 'react-router';

export function meta() {
  return [
    { title: 'AkikSystems' },
    {
      name: 'description',
      content: 'AkikSystems platform walking skeleton.',
    },
  ];
}

export default function Home() {
  return (
    <main>
      <p>AkikSystems</p>
      <h1>Platform walking skeleton</h1>
      <p>This page is rendered on the server and hydrated for client navigation.</p>
      <Link to="/about">Open the client-navigation proof route</Link>
    </main>
  );
}
