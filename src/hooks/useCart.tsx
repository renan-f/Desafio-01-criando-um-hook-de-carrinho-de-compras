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

  const addProduct = async (productId: number) => {

    try {
      const productsInCart: Product[] = [...cart];
      const selectedProduct = productsInCart.find(product => product.id === productId);
      const stockProduct = await (await api.get(`/stock/${productId}`)).data;

      const amountSelectedProduct = selectedProduct ? selectedProduct.amount : 0;

      if (amountSelectedProduct + 1 > stockProduct.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (selectedProduct) {
        selectedProduct.amount++;
      } else {
        const product = await (await api.get(`/products/${productId}`)).data;
        const newProduct = {
          ...product,
          amount: 1
        }
        productsInCart.push(newProduct);
      }

      setCart(productsInCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsInCart));


    } catch {
      toast.error("Erro na adição do produto");
    }

  };

  const removeProduct = (productId: number) => {
    try {
      const productsInCart: Product[] = [...cart];
      const selectedProduct = productsInCart.find(product => product.id === productId);
      if (!selectedProduct) {
        toast.error('Erro na remoção do produto');
        return;
      }

      productsInCart.splice(productsInCart.findIndex(product => product.id === productId), 1);
      setCart(productsInCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsInCart));

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) { return }

      const productsInCart: Product[] = [...cart];
      const selectedProduct = productsInCart.find(product => product.id === productId);

      if (!selectedProduct) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      const amountSelectProduct = selectedProduct ? selectedProduct?.amount : 0;

      if (amount > amountSelectProduct) {
        const stockProduct = await (await api.get(`/stock/${productId}`)).data;

        if (stockProduct.amount < amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        } else {
          selectedProduct.amount++;
        }
      }
      if (amount < amountSelectProduct) {
        selectedProduct.amount--;
      }

      setCart(productsInCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsInCart));

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
