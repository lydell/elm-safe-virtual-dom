module KeyList exposing (main)

import Array exposing (Array)
import Array.Extra
import Browser
import Html exposing (Html)
import Html.Attributes as Attr
import Html.Events exposing (onClick, onInput, stopPropagationOn)
import Html.Keyed
import Json.Decode as Decode
import Random
import Random.Array


main : Program () Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }


type alias Model =
    { items : Array Item
    , uid : Int
    , seed : Random.Seed
    }


type alias Item =
    { id : String
    , text : String
    }


init : () -> ( Model, Cmd Msg )
init () =
    let
        items =
            List.range 1 1000
                |> List.map initItem
                |> Array.fromList
    in
    ( { items = items
      , uid = Array.length items + 1
      , seed = Random.initialSeed 0
      }
    , Cmd.none
    )


initItem : Int -> Item
initItem id =
    { id = String.fromInt id
    , text = "Item " ++ String.fromInt id
    }


type Msg
    = Add1Clicked
    | ReverseClicked
    | ShuffleClicked
    | MoveFromStartClicked
    | MoveFromEndClicked
    | ItemInput Int String
    | ItemKeyDown Int String
    | RemoveClicked Int
    | AddAboveClicked Int
    | AddBelowClicked Int
    | SwapClicked Int Int


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Add1Clicked ->
            add1 model

        ReverseClicked ->
            reverse model

        ShuffleClicked ->
            shuffle model

        MoveFromStartClicked ->
            move 2 (Array.length model.items - 3) model

        MoveFromEndClicked ->
            move (Array.length model.items - 3) 2 model

        ItemInput index text ->
            ( { model | items = Array.Extra.update index (updateText text) model.items }, Cmd.none )

        ItemKeyDown index code ->
            case code of
                "Digit1" ->
                    add1 model

                "Digit2" ->
                    reverse model

                "Digit3" ->
                    shuffle model

                "Digit4" ->
                    move index 0 model

                _ ->
                    ( model, Cmd.none )

        RemoveClicked index ->
            ( { model | items = Array.Extra.removeAt index model.items }, Cmd.none )

        AddAboveClicked index ->
            ( { model
                | items = Array.Extra.insertAt index (initItem model.uid) model.items
                , uid = model.uid + 1
              }
            , Cmd.none
            )

        AddBelowClicked index ->
            ( { model
                | items = Array.Extra.insertAt (index + 1) (initItem model.uid) model.items
                , uid = model.uid + 1
              }
            , Cmd.none
            )

        SwapClicked index delta ->
            ( { model | items = swap index delta model.items }, Cmd.none )


add1 : Model -> ( Model, Cmd Msg )
add1 model =
    ( { model
        | items = Array.append model.items (Array.fromList [ initItem model.uid ])
        , uid = model.uid + 1
      }
    , Cmd.none
    )


reverse : Model -> ( Model, Cmd Msg )
reverse model =
    ( { model | items = reverseArray model.items }, Cmd.none )


shuffle : Model -> ( Model, Cmd Msg )
shuffle model =
    let
        ( nextItems, nextSeed ) =
            Random.step (Random.Array.shuffle model.items) model.seed
    in
    ( { model | items = nextItems, seed = nextSeed }, Cmd.none )


move : Int -> Int -> Model -> ( Model, Cmd Msg )
move fromIndex toIndex model =
    ( { model | items = moveArray fromIndex toIndex model.items }, Cmd.none )


moveArray : Int -> Int -> Array a -> Array a
moveArray fromIndex toIndex array =
    let
        append a1 a2 =
            Array.append a2 a1
    in
    case ( Array.get fromIndex array, Array.get toIndex array ) of
        ( Just from, Just _ ) ->
            if fromIndex <= toIndex then
                Array.slice 0 fromIndex array
                    |> append (Array.slice (fromIndex + 1) (toIndex + 1) array)
                    |> Array.push from
                    |> append (Array.slice (toIndex + 1) (Array.length array) array)

            else
                Array.slice 0 toIndex array
                    |> Array.push from
                    |> append (Array.slice toIndex fromIndex array)
                    |> append (Array.slice (fromIndex + 1) (Array.length array) array)

        _ ->
            array


updateText : String -> Item -> Item
updateText text item =
    { item | text = text }


reverseArray : Array a -> Array a
reverseArray =
    Array.foldr Array.push Array.empty


swap : Int -> Int -> Array a -> Array a
swap index delta array =
    case ( Array.get (index + delta) array, Array.get index array ) of
        ( Just other, Just item ) ->
            array
                |> Array.set (index + delta) item
                |> Array.set index other

        _ ->
            array


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.none


view : Model -> Html Msg
view model =
    Html.div []
        [ Html.button [ onClick Add1Clicked ] [ Html.text "Add 1" ]
        , Html.button [ onClick ReverseClicked ] [ Html.text "Reverse" ]
        , Html.button [ onClick ShuffleClicked ] [ Html.text "Shuffle" ]
        , Html.button [ onClick MoveFromStartClicked ] [ Html.text "Move from start" ]
        , Html.button [ onClick MoveFromEndClicked ] [ Html.text "Move from end" ]
        , Html.Keyed.ul []
            (model.items
                |> Array.toList
                |> List.indexedMap
                    (\index item ->
                        ( item.id
                        , Html.li []
                            [ Html.input
                                [ Attr.value item.text
                                , onInput (ItemInput index)
                                , stopPropagationOn "keydown" (Decode.field "code" Decode.string |> Decode.map (\code -> ( ItemKeyDown index code, True )))
                                ]
                                []
                            , Html.button [ onClick (SwapClicked index -1) ] [ Html.text "⬆️" ]
                            , Html.button [ onClick (SwapClicked index 1) ] [ Html.text "⬇️" ]
                            , Html.button [ onClick (SwapClicked index -5) ] [ Html.text "5⬆️" ]
                            , Html.button [ onClick (SwapClicked index 5) ] [ Html.text "5⬇️" ]
                            , Html.button [ onClick (AddAboveClicked index) ] [ Html.text "⤴️" ]
                            , Html.button [ onClick (AddBelowClicked index) ] [ Html.text "⤵️" ]
                            , Html.button [ onClick (RemoveClicked index) ] [ Html.text "❌" ]
                            ]
                        )
                    )
            )
        ]
