const { createClient } = require('@supabase/supabase-base');
require('dotenv').config();

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);

async function checkProducts() {
    const { data, error } = await supabase
        .from('product_donations')
        .select('id, product_name, image_url')
        .eq('status', 'approved')
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Recent approved products:');
    console.log(JSON.stringify(data, null, 2));
}

checkProducts();
