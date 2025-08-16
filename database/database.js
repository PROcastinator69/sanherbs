async insertSampleData() {
    console.log('📦 Checking for existing data...');
    try {
        // Remove any existing products and plans completely
        await this.run('DELETE FROM products');
        await this.run('DELETE FROM subscription_plans');
        // Insert only your Spirulina Capsules as the main product
        const product = {
            name: 'SanHerbs Spirulina Capsules',
            subtitle: '60 Veg Capsules • Dietary Food Supplement',
            description: 'Proudly organic Spirulina capsules by SanHerbs. Natural nutraceutical supplement to support daily nutritional needs, immunity, and vitality. Approved by FSSAI. Not a medicine.',
            price: 459,
            original_price: 599,
            category: 'food supplement',
            benefits: JSON.stringify([
                '🌿 100% Natural and Organic',
                '🛡️ Supports Immunity',
                '💪 Boosts Vitality and Energy',
                '🌱 Rich Plant Protein',
                'FSSAI Certified Food Supplement'
            ]),
            ingredients: 'Organic Spirulina Powder (500 mg per capsule)',
            image_url: '/images/products/spirulina.jpg',
            stock_quantity: 200,
            is_featured: 1
        };
        await this.run(
            `INSERT INTO products (name, subtitle, description, price, original_price, category, benefits, ingredients, image_url, stock_quantity, is_featured, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
                product.name,
                product.subtitle,
                product.description,
                product.price,
                product.original_price,
                product.category,
                product.benefits,
                product.ingredients,
                product.image_url,
                product.stock_quantity,
                product.is_featured
            ]
        );
        console.log(`✅ Inserted main Spirulina product, all previous products deleted.`);

        // Optionally, update subscription plans similarly or clear
        await this.run('DELETE FROM subscription_plans');
        // (You can add a plan for Spirulina if desired)
        console.log('✅ Sample data insertion completed successfully');
    } catch (error) {
        console.error('❌ Error inserting sample data:', error);
        throw error;
    }
}
