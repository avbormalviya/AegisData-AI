import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts"

export const ChartRenderer = ({ chartSpec }) => {
    if (!chartSpec) return null
    const spec = typeof chartSpec === 'string' ? JSON.parse(chartSpec) : chartSpec
    
    return (
        <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
                {spec.chart_type === "bar" ? (
                    <BarChart data={spec.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={spec.x_key} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey={spec.y_key} fill="#8884d8" />
                    </BarChart>
                ) : (
                    <LineChart data={spec.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={spec.x_key} />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey={spec.y_key} stroke="#8884d8" />
                    </LineChart>
                )}
            </ResponsiveContainer>
        </div>
    )
}   
