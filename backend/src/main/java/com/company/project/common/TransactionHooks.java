package com.company.project.common;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Small helpers around Spring's transaction synchronization. */
public final class TransactionHooks {

    private TransactionHooks() {
    }

    /**
     * Runs {@code action} once the current transaction has committed, so irreversible side effects
     * (deleting files) never happen for a change that ends up rolled back. Outside a transaction
     * (plain unit tests) there is nothing to wait for, so it runs immediately.
     */
    public static void afterCommit(Runnable action) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            action.run();
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }
}
