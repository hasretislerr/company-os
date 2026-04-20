'use client';

import { useState } from 'react';

export default function TestPage() {
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);

    const testConnection = async () => {
        setLoading(true);
        setResult('Testing...');

        try {
            const response = await fetch('http://localhost:8080/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'test' + Date.now() + '@example.com',
                    password: 'password123',
                    first_name: 'Test',
                    last_name: 'User',
                }),
            });

            const data = await response.json();
            setResult(JSON.stringify(data, null, 2));
        } catch (error) {
            setResult('Error: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-8 bg-gray-50">
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
                <h1 className="text-2xl font-bold mb-4">API Connection Test</h1>

                <button
                    onClick={testConnection}
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Testing...' : 'Test Backend Connection'}
                </button>

                {result && (
                    <div className="mt-6">
                        <h2 className="font-semibold mb-2">Result:</h2>
                        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                            {result}
                        </pre>
                    </div>
                )}

                <div className="mt-6 text-sm text-gray-600">
                    <p><strong>Backend URL:</strong> http://localhost:8080/api</p>
                    <p><strong>Frontend URL:</strong> {typeof window !== 'undefined' ? window.location.origin : 'N/A'}</p>
                </div>
            </div>
        </div>
    );
}
