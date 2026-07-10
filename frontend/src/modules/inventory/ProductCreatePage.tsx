import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import ProductForm from './ProductForm';
import { useToast } from '../../components/ToastContext';
import type { Category, Product } from './ProductsPage';

export default function ProductCreatePage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Category[]>('/categories?active=true'),
      api.get<Product[]>('/products?active=true'),
    ])
      .then(([catRes, prodRes]) => {
        setCategories(catRes.data);
        setAllProducts(prodRes.data);
      })
      .catch(() => {
        showToast('Error al cargar los datos necesarios', 'error');
        setLoadFailed(true);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Cargando...</p>;
  if (loadFailed) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 mb-3">No se pudieron cargar los datos.</p>
        <button
          onClick={() => navigate('/productos')}
          className="text-blue-600 hover:underline text-sm"
        >
          Volver a productos
        </button>
      </div>
    );
  }

  return (
    <ProductForm
      initial={null}
      categories={categories}
      allProducts={allProducts}
      onSaved={() => navigate('/productos')}
      onCancel={() => navigate('/productos')}
    />
  );
}
