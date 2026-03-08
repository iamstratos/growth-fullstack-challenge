import { GraphQLLong, GraphQLJSON } from "graphql-scalars";
import { ProfileRepository } from "../repository/profileRepository";
import { ParentProfileBackend, PaymentMethod } from "../parentProfileBackend";

const profileRepository = new ProfileRepository();

function toSnapshot(pm: PaymentMethod) {
  return { method: pm.method, isActive: pm.isActive };
}

async function getParentName(parentId: number): Promise<string> {
  const profiles = await profileRepository.retrieveParentProfiles(parentId);
  return profiles[0]?.name ?? "Unknown";
}

export const resolvers = {
  Long: GraphQLLong,
  JSON: GraphQLJSON,
  Query: {
    parentProfile: async (_: any, { parentId }: { parentId: number }) => {
      return new ParentProfileBackend(await profileRepository.retrieveParentProfiles(parentId), [], []).parentProfile(parentId);
    },
    paymentMethods: async (_: any, { parentId }: { parentId: number }) => {
      return new ParentProfileBackend([], [], await profileRepository.retrievePaymentMethods(parentId)).paymentMethods(parentId);
    },
    invoices: async (_: any, { parentId }: { parentId: number }) => {
      return new ParentProfileBackend([], await profileRepository.retrieveInvoices(parentId), []).invoices(parentId);
    },
    paymentMethodAuditLog: async (_: any, { parentId }: { parentId: number }) => {
      return profileRepository.retrieveAuditLogs(parentId);
    },
  },
  Mutation: {
    addPaymentMethod: async (
      _: any,
      { parentId, method }: { parentId: number; method: string },
    ) => {
      const existing = await profileRepository.retrievePaymentMethods(parentId);
      const isActive = existing.length === 0;
      const paymentMethod = await profileRepository.createPaymentMethod({ id: 0, parentId, method, isActive, createdAt: "" });

      const changedBy = await getParentName(parentId);
      await profileRepository.createAuditLog({
        paymentMethodId: paymentMethod.id,
        parentId,
        action: "ADD",
        oldState: null,
        newState: toSnapshot(paymentMethod),
        changedBy,
      });

      return new ParentProfileBackend([], [], [paymentMethod]).paymentMethod(paymentMethod.id);
    },
    setActivePaymentMethod: async (
      _: any,
      { parentId, methodId }: { parentId: number; methodId: number },
    ) => {
      const methodsBefore = await profileRepository.retrievePaymentMethods(parentId);
      const parentProfileBackend = new ParentProfileBackend([], [], methodsBefore).setActivePaymentMethod(parentId, methodId);
      const methodsAfter = parentProfileBackend.paymentMethods(parentId);

      await profileRepository.updatePaymentMethods(methodsAfter);

      const changedBy = await getParentName(parentId);
      const auditPromises = methodsBefore
        .filter((before) => {
          const after = methodsAfter.find((m) => m.id === before.id);
          return after && after.isActive !== before.isActive;
        })
        .map((before) => {
          const after = methodsAfter.find((m) => m.id === before.id)!;
          return profileRepository.createAuditLog({
            paymentMethodId: before.id,
            parentId,
            action: "UPDATE",
            oldState: toSnapshot(before),
            newState: toSnapshot(after),
            changedBy,
          });
        });
      await Promise.all(auditPromises);

      return parentProfileBackend.paymentMethod(methodId);
    },
    deletePaymentMethod: async (
      _: any,
      { parentId, methodId }: { parentId: number; methodId: number },
    ) => {
      const methods = await profileRepository.retrievePaymentMethods(parentId);
      const target = methods.find((m) => m.id === methodId);
      new ParentProfileBackend([], [], methods).deletePaymentMethod(parentId, methodId);
      const result = await profileRepository.deletePaymentMethod(parentId, methodId);

      if (target) {
        const changedBy = await getParentName(parentId);
        await profileRepository.createAuditLog({
          paymentMethodId: methodId,
          parentId,
          action: "DELETE",
          oldState: toSnapshot(target),
          newState: null,
          changedBy,
        });
      }

      return result;
    },
  },
};
