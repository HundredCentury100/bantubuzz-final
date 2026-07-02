import { normalizeBankDetails } from '../utils/bankDetails';

const DetailRow = ({ label, value, valueClassName = '' }) => {
  if (!value) return null;
  return (
    <p>
      <strong>{label}:</strong>{' '}
      <span className={valueClassName}>{value}</span>
    </p>
  );
};

const BankTransferDetails = ({ bankDetails = null, reference = null, compact = false }) => {
  const details = normalizeBankDetails(bankDetails, reference);

  return (
    <div className={compact ? 'space-y-3 text-sm' : 'space-y-4 text-sm'}>
      {details.accounts.map((account) => (
        <div key={`${account.bank_name}-${account.account_number}`} className={compact ? '' : 'rounded-2xl bg-white/60 p-4'}>
          <p className="font-bold">{account.bank_name}</p>
          <DetailRow label="Account Name" value={account.account_name} />
          <DetailRow label="Account Number" value={account.account_number} valueClassName="font-mono" />
          <DetailRow label="Currency" value={account.currency} />
          <DetailRow label="Account Type" value={account.account_type} />
          <DetailRow label="Branch" value={account.branch} />
          <DetailRow label="Branch Code" value={account.branch_code} />
          <DetailRow label="Swift Code" value={account.swift_code} valueClassName="font-mono" />
        </div>
      ))}

      {details.reference && (
        <p>
          <strong>Reference:</strong>{' '}
          <span className="font-mono bg-blue-100 px-2 py-0.5 rounded text-blue-800">{details.reference}</span>
        </p>
      )}
    </div>
  );
};

export default BankTransferDetails;
