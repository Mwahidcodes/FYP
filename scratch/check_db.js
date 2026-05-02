
const supabaseUrl = "https://vlgmdueyhwtpylqmugku.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsZ21kdWV5aHd0cHlscW11Z2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NjQ5MDksImV4cCI6MjA3ODU0MDkwOX0.UpByNTnHaBGHsIAOOxPiotgfYZmZ-J7eb-vVeFzso8k";

async function checkBidding() {
    const response = await fetch(`${supabaseUrl}/rest/v1/bidding_products?select=id,product_name,status,created_at&order=created_at.desc`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}

checkBidding();
