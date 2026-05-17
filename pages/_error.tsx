import { NextPage } from 'next';

interface ErrorProps {
  statusCode?: number;
}

const Error: NextPage<ErrorProps> = ({ statusCode }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>
          {statusCode ? `Gabim ${statusCode}` : 'Ndodhi nje gabim'}
        </h1>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          {statusCode === 404 ? 'Faqja nuk u gjet.' : 'Dicka shkoi keq.'}
        </p>
      </div>
    </div>
  );
};

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
