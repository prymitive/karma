import React, {
  FC,
  useState,
  ReactNode,
  Ref,
  CSSProperties,
  useEffect,
} from "react";

import { useFloating, shift, flip, offset, size } from "@floating-ui/react-dom";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";

import type {
  APIAlertmanagerUpstreamT,
  APIManagedSilenceT,
} from "Models/APITypes";
import type { AlertStore } from "Stores/AlertStore";
import type { SilenceFormStore } from "Stores/SilenceFormStore";
import { ManagedSilence } from "Components/ManagedSilence";
import { TooltipWrapper } from "Components/TooltipWrapper";
import { DropdownSlide } from "Components/Animations/DropdownSlide";
import { Modal } from "Components/Modal";

export interface ClusterSilenceT {
  cluster: string;
  id: string;
}

export const SelectableSilence: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  silence: APIManagedSilenceT;
  selected: boolean;
  onSelect: (c: string, s: string, v: boolean) => void;
}> = ({ alertStore, silenceFormStore, silence, selected, onSelect }) => {
  return (
    <div className="d-flex">
      <div className="form-check my-auto">
        <input
          className="form-check-input cursor-pointer"
          type="checkbox"
          value=""
          checked={selected}
          onChange={(event) => {
            onSelect(silence.cluster, silence.silence.id, event.target.checked);
          }}
          disabled={silence.isExpired}
        />
      </div>
      <ManagedSilence
        cluster={silence.cluster}
        alertCount={silence.alertCount}
        alertCountAlwaysVisible={true}
        silence={silence.silence}
        alertStore={alertStore}
        silenceFormStore={silenceFormStore}
        isNested={true}
      />
    </div>
  );
};

const SilenceDeleteMenu: FC<{
  x: number | null;
  y: number | null;
  floating: Ref<HTMLDivElement> | null;
  strategy: CSSProperties["position"];
  maxHeight: number | null;
  children: ReactNode;
}> = ({ x, y, floating, strategy, maxHeight, children }) => {
  return (
    <div
      className="dropdown-menu d-block shadow m-0"
      ref={floating}
      style={{
        position: strategy,
        top: y ?? "",
        left: x ?? "",
        maxHeight: maxHeight ?? "",
      }}
    >
      {children}
    </div>
  );
};

export const SilenceDelete: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  silences: ClusterSilenceT[];
  disabled: boolean;
  isOpen: boolean;
  toggle: () => void;
  children: ReactNode;
}> = ({
  alertStore,
  silenceFormStore,
  silences,
  disabled,
  isOpen,
  toggle,
  children,
}) => {
  const [maxHeight, setMaxHeight] = useState<number | null>(null);

  const { x, y, refs, strategy } = useFloating({
    placement: "bottom-end",
    middleware: [
      shift(),
      flip(),
      offset(5),
      size({
        apply({ availableHeight }) {
          setMaxHeight(availableHeight);
        },
      }),
    ],
  });

  const [visible, setVisible] = useState<boolean>(false);

  return (
    <div className="btn-group" role="group">
      <button
        onClick={() => setVisible(true)}
        type="button"
        className="btn btn-danger border-0"
        disabled={disabled}
      >
        <TooltipWrapper title="Delete selected silences">
          <FontAwesomeIcon icon={faTrash} />
        </TooltipWrapper>
      </button>
      <Modal
        isOpen={visible}
        isUpper={true}
        toggleOpen={() => setVisible(false)}
      >
        <SilenceDeleteModalContent
          alertStore={alertStore}
          silenceFormStore={silenceFormStore}
          silences={silences}
          onHide={() => setVisible(false)}
        />
      </Modal>
      <div className="btn-group" role="group">
        <button
          type="button"
          className="btn btn-danger dropdown-toggle border-0"
          ref={refs.setReference}
          onClick={toggle}
        ></button>
        <DropdownSlide in={isOpen} unmountOnExit>
          <SilenceDeleteMenu
            x={x}
            y={y}
            floating={refs.setFloating}
            strategy={strategy}
            maxHeight={maxHeight}
            children={children}
          />
        </DropdownSlide>
      </div>
    </div>
  );
};

const SilenceDeleteModalContent: FC<{
  alertStore: AlertStore;
  silenceFormStore: SilenceFormStore;
  silences: ClusterSilenceT[];
  onHide: () => void;
}> = ({ alertStore, silenceFormStore, silences, onHide }) => {
  useEffect(() => {
    silenceFormStore.toggle.setBlur(true);
    return () => silenceFormStore.toggle.setBlur(false);
  }, [silenceFormStore.toggle]);

  return (
    <>
      <div className="modal-header">
        <h5 className="modal-title">Delete silence</h5>
        <button type="button" className="btn-close" onClick={onHide}></button>
      </div>
      <div className="modal-body">
        <MassDeleteProgress alertStore={alertStore} silences={silences} />
      </div>
    </>
  );
};

export const MassDeleteProgress: FC<{
  alertStore: AlertStore;
  silences: ClusterSilenceT[];
}> = ({ alertStore, silences }) => {
  const [done, setDone] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const deleteSilence = async (
      cluster: string,
      id: string,
      ams: APIAlertmanagerUpstreamT[],
    ) => {
      let err = "";
      for (const am of ams) {
        const uri = `${am.uri}/api/v2/silence/${id}`;
        try {
          const res = await fetch(uri, {
            method: "DELETE",
            ...{
              headers: am.headers,
              credentials: am.corsCredentials,
            },
          });
          if (res.ok) {
            setDone((v) => v + 1);
            break;
          } else {
            err = await res.text();
          }
        } catch (error) {
          err =
            error instanceof Error ? error.message : `unknown error: ${error}`;
        }
      }
      if (err !== "") {
        setErrors((v) => [
          `${cluster}/${id} failed to delete with error: ${err}`,
          ...v,
        ]);
      }
    };

    silences.forEach((silence, index) => {
      const ams = alertStore.data.readWriteAlertmanagers.filter(
        (u) => u.cluster === silence.cluster,
      );
      setTimeout(
        () => deleteSilence(silence.cluster, silence.id, ams),
        50 * index,
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="px-2 py-5 bg-transparent">
        <h2 className="display-6 text-placeholder text-center">
          {done + errors.length < silences.length ? (
            <>
              Deleting silence {done + errors.length} / {silences.length}
            </>
          ) : (
            <>Completed</>
          )}
        </h2>
      </div>
      <div className="progress">
        <div
          className="progress-bar bg-success"
          role="progressbar"
          style={{ width: `${(done / silences.length) * 100}%` }}
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={silences.length}
        ></div>
        <div
          className="progress-bar bg-danger"
          role="progressbar"
          style={{ width: `${(errors.length / silences.length) * 100}%` }}
          aria-valuenow={errors.length}
          aria-valuemin={0}
          aria-valuemax={silences.length}
        ></div>
      </div>
      {errors.length ? (
        <div
          className="mt-3 rounded bg-dark text-white p-1"
          style={{ fontSize: "80%" }}
        >
          {errors.map((err, index) => (
            <React.Fragment key={index}>
              <samp>{err}</samp>
              {index < errors.length - 1 && <hr className="my-1"></hr>}
            </React.Fragment>
          ))}
        </div>
      ) : null}
    </>
  );
};
