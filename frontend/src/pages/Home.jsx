import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto p-6 mt-10">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
          Every dollar has a story.
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Trace reads your bank statements, verifies client claims, and finds subscription leaks — telling the truth with evidence.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Card 1: Verify Claim */}
        <Link to="/verify" className="block group">
          <div className="bg-white border border-gray-200 rounded-xl p-6 h-full shadow-sm hover:shadow-md hover:border-blue-300 transition-all">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 text-2xl font-bold">✓</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
              Verify a Client Claim
            </h2>
            <p className="text-gray-600 text-sm">
              Did a client really pay? Paste their claim, and we'll match it against your bank statement to give you a verified verdict.
            </p>
          </div>
        </Link>

        {/* Card 2: Subscription Leaks */}
        <Link to="/subscriptions" className="block group">
          <div className="bg-white border border-gray-200 rounded-xl p-6 h-full shadow-sm hover:shadow-md hover:border-green-300 transition-all">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4 text-2xl font-bold">$</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
              Find Subscription Leaks
            </h2>
            <p className="text-gray-600 text-sm">
              Are you paying for tools you forgot about? We'll scan your statement and detect all recurring monthly charges.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}