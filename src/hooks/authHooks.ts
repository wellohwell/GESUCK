import { useAuth } from '../providers/AuthProvider';

export const useRole = () => {
    const { role } = useAuth();
    return role;
};

export const useBranch = () => {
    const { branch, branchId, spreadsheetId } = useAuth();
    return {
        branch,
        branchId,
        branchName: branch?.name || null,
        spreadsheetId,
    };
};
