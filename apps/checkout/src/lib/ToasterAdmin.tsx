// Toaster do backoffice. Fica em arquivo próprio para o `sonner` (e a folha de
// estilo que ele injeta no <head>) só ser baixado em rotas `/admin`; o comprador
// do checkout nunca carrega esse código. Ver `App.tsx`.
import { Toaster } from 'sonner';

const ToasterAdmin = () => <Toaster position="top-center" richColors />;

export default ToasterAdmin;
