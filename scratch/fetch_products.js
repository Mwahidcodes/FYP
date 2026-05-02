const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://vlgmdueyhwtpylqmugku.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsZ21kdWV5aHd0cHlscW11Z2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NjQ5MDksImV4cCI6MjA3ODU0MDkwOX0.UpByNTnHaBGHsIAOOxPiotgfYZmZ-J7eb-vVeFzso8k";

const supabase = createClient(supabaseUrl, supabaseKey);

async function getProducts() {
    const { data, error } = await supabase
        .from('product_donations')
        .select('*')
        .eq('status', 'approved')
        .limit(20);

    if (error) {
        console.error('Error:', error);
    } else {
        const uniqueItems = [];
        const seenNames = new Set();
        
        for (const item of data) {
            if (!seenNames.has(item.product_name)) {
                uniqueItems.push(item);
                seenNames.add(item.product_name);
            }
            if (uniqueItems.length === 3) break;
        }
        
        console.log(JSON.stringify(uniqueItems, null, 2));
    }
}

getProducts();
