import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  useEffect(() => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
  }, [cart])

  const addProduct = async (productId: number) => {
    try {
      const stockProduct = await (await api.get(`/stock/${productId}`)).data;
      const productsInCart: Product[] = [...cart];
      const selectedProduct = productsInCart.find(product => product.id === productId);

      if ((selectedProduct?.amount && selectedProduct?.amount + 1 > stockProduct.amount) || stockProduct.amount === 0) {
        throw Error("Quantidade solicitada fora de estoque")
      }

      if (!selectedProduct) {
        const productData = await (await api.get(`/products/${productId}`)).data;

        productsInCart.push(
          {
            ...productData,
            amount: 1
          }
        );

        setCart(productsInCart);

      } else {
        selectedProduct.amount++;
        setCart(productsInCart);
      }

    } catch {
      toast.error("Quantidade solicitada fora de estoque");
    }

  };

  const removeProduct = (productId: number) => {
    try {
      const productsInCart: Product[] = [...cart];
      productsInCart.splice(productsInCart.findIndex(product => product.id === productId), 1);
      setCart(productsInCart);
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productsInCart: Product[] = [...cart];
      const selectedProduct = productsInCart.find(p => p.id === productId);

      if (selectedProduct && amount > selectedProduct?.amount) {
        const stockProduct = await (await api.get(`/stock/${productId}`)).data;

        if (stockProduct.amount < amount) {
          throw Error("Quantidade solicitada fora de estoque")
        } else {
          selectedProduct.amount++;
        }
      }
      if (selectedProduct && amount < selectedProduct?.amount) {
        selectedProduct.amount--;
      }

      setCart(productsInCart);
    } catch {
      toast.error('Quantidade solicitada fora de estoque');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
