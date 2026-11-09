# Personal and Chuck

Personal is CRAYS's application workspace for personal tools and interactions. Chuck is the personal-intelligence integration spanning the application, agent, broker, tools and workflows. Reading these as separate layers makes it easier to contribute to one area without assuming that a frontend screen contains the entire agent system.

## Follow the implementation

- [Personal source guide](https://github.com/CraysCircle/crays-platform/blob/main/apps/personal/README.md) describes the original frontend and its thirteen-overlay source view.
- [Application connections](https://github.com/CraysCircle/crays-platform/blob/main/apps/personal/source/src/appConnections.ts) provides a concrete frontend integration entry point.
- [Chuck public starters](https://github.com/CraysCircle/crays-platform/blob/main/apps/personal/source/src/chuckPublicStarters.mjs) and [task review links](https://github.com/CraysCircle/crays-platform/blob/main/apps/personal/source/src/chuckTaskReviewLinks.mjs) are captured application-side sources.
- [Personal build sources](https://github.com/CraysCircle/crays-platform/blob/main/operations/personal-build/README.md) preserve the original build/configuration controllers separately from the application.

The preserved frontend dependency record identifies React **19.2.7**. It is distinct from the shared Club/Member capture's React version. The later Personal-Intelligence reconciliation refers to **source1989** and **46 original CNR source packages**; that reference is a source-authority record, not an invented OpenClaw release number.

## Work on this area

Begin with the frontend source guide and trace the relevant interface to its actual application/provider boundary. Useful contributions include clearer tool and task contracts, explicit permission and account boundaries, meaningful synthetic-data tests, and documenting the path from application action to broker/workflow behavior.

Set up only the layer being developed with reviewed synthetic inputs. Original owner state, credentials and model accounts must remain separate from public examples. The complete agent/broker environment should not be inferred from a frontend package installation.

## Integration status

Existing records substantiate a composed agent/broker/tool system and separately preserved Personal-Intelligence sources. They do not establish complete public custody of every latest Chuck/broker/CNR file or acceptance of the latest entire AWS composition. The public frontend and build sources are concrete contribution entry points; remaining agent/source/runtime bindings and original dependency notices need their own completion.

[Back to services](README.md)
