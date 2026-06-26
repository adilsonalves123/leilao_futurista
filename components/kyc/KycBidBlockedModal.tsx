import type { StatusVerificacao } from '@/src/types/kyc';

import { KycRequiredModal } from './KycRequiredModal';



type KycBidBlockedModalProps = {

  visible: boolean;

  onClose: () => void;

  status: StatusVerificacao;

};



/** @deprecated Use KycRequiredModal com motivo="lance" */

export function KycBidBlockedModal({ visible, onClose, status }: KycBidBlockedModalProps) {

  return (

    <KycRequiredModal visible={visible} onClose={onClose} status={status} motivo="lance" />

  );

}

